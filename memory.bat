@echo off
REM 
Title Batch Script para checar uso de CPU %% e MEM %%
Color 0A
rem Note: KB = KiB, MB = MiB and GB = GiB in this batch file, see
rem       https://en.wikipedia.org/wiki/Gibibyte for details on GiB.

rem Create a copy of current environment variables. Enabling additionally
rem delayed environment variable expansion is not required for this task.
setlocal

rem The command WMIC with the parameters CPU get loadpercentage outputs
rem one line per processor. The output of WMIC is in UTF-16 LE with BOM.
rem The output is redirected to a temporary file which is printed by
rem command TYPE to STDOUT which makes a better job on UNICODE to ASCII
rem conversion as command FOR. Note: 1 processor can have 1 or more cores.

set "CpuUsage=0"
set "Processors=0"
%SystemRoot%\System32\wbem\wmic.exe CPU get loadpercentage >"%TEMP%\cpu_usage.tmp"
for /F "skip=1" %%P in ('type "%TEMP%\cpu_usage.tmp"') do (
    set /A CpuUsage+=%%P
    set /A Processors+=1
)
del "%TEMP%\cpu_usage.tmp"

rem Calculate the CPU usage as percentage value of all processors.
set /A CpuUsage/=Processors
goto GetTotalMemory

rem Output of WMIC is in UTF-16 LE with BOM. The interpretation of this
rem output in ASCII/OEM can result in processing three lines instead of
rem just two with third line being just a carriage return. Therefore exit
rem each loop after assigning the value of second line to the variable.

:GetTotalMemory
for /F "skip=1" %%M in ('%SystemRoot%\System32\wbem\wmic.exe ComputerSystem get TotalPhysicalMemory') do set "TotalMemory=%%M" & goto GetAvailableMemory
:GetAvailableMemory
for /F "skip=1" %%M in ('%SystemRoot%\System32\wbem\wmic.exe OS get FreePhysicalMemory') do set "AvailableMemory=%%M" & goto ProcessValues

rem Total physical memory is in bytes which can be greater 2^31 (= 2 GB)
rem Windows command processor performs arithmetic operations always with
rem 32-bit signed integer. Therefore more than 2 GB installed physical
rem memory exceeds the bit width of a 32-bit signed integer and arithmetic
rem calculations are wrong on more than 2 GB installed memory. To avoid
rem the integer overflow, the last 6 characters are removed from bytes
rem value and the remaining characters are divided by 1073 to get the
rem number of GB. This workaround works only for physical RAM being
rem an exact multiple of 1 GB, i.e. for 1 GB, 2 GB, 4 GB, 8 GB, ...

rem  1 GB =  1.073.741.824 bytes = 2^30
rem  2 GB =  2.147.483.648 bytes = 2^31
rem  4 GB =  4.294.967.296 bytes = 2^32
rem  8 GB =  8.589.934.592 bytes = 2^33
rem 16 GB = 17.179.869.184 bytes = 2^34
rem 32 GB = 34.359.738.368 bytes = 2^35

rem But there is one more problem at least on Windows XP x86. About 50 MB
rem of RAM is subtracted as used by Windows itself. This can be seen in
rem system settings when 1.95 GB is displayed although 2 GB is installed.
rem Therefore add 50 MB before dividing by 1073.

:ProcessValues
set "TotalMemory=%TotalMemory:~0,-6%"
set /A TotalMemory+=50
set /A TotalMemory/=1073

rem The total memory in GB must be multiplied by 1024 to get the
rem total physical memory in MB which is always small enough to
rem be calculated with a 32-bit signed integer.

set /A TotalMemory*=1024

rem The available memory is in KB and therefore there is
rem no problem with value range of 32-bit signed integer.

set /A AvailableMemory/=1024

rem So the used memory in MB can be determined easily.

set /A UsedMemory=TotalMemory - AvailableMemory

rem It is necessary to calculate the percentage value in MB instead of
rem KB to avoid a 32-bit signed integer overflow on 32 GB RAM and nearly
rem entire RAM is available because used is just a small amount of RAM.

set /A UsedPercent=(UsedMemory * 100) / TotalMemory

if "%Processors%" == "1" (
    set "ProcessorInfo="
) else (
    set "ProcessorInfo= of %Processors% processors"
)
echo(
echo(   CPU porcentagem :  %CpuUsage% %%%ProcessorInfo%
echo(   Memoria Livre    :  %AvailableMemory% MB
echo(   Total de Memoria :  %TotalMemory% MB
echo(   Uso de Memoria    :  %UsedMemory% MB
echo(   Memoria Usada   :  %UsedPercent% %%

REM The second PS script from here
REM https://social.technet.microsoft.com/Forums/en-US/f7a18798-3b32-4018-a4b1-3f629655f5a5/get-process-memory-usage?forum=winserverpowershell
Call :Generate_PS_File
echo( ---------------------------------------------------------------------------
echo( Digite o nome do processo para verificar :
Set /P "ProcessName="
Powershell.exe -executionpolicy remotesigned -File "%tmp%\%~n0.ps1" | find /I "%ProcessName%"
Pause & Exit
REM -----------------------------------------------------------------------------
:Generate_PS_File
>"%tmp%\%~n0.ps1" (
 echo    $ProcArray = @(^)
 echo    $Processes = get-process ^| Group-Object -Property ProcessName
 echo    foreach($Process in $Processes^)
 echo    {
 echo        $prop = @(
 echo                @{n='Count';e={$Process.Count}}
 echo                @{n='Name';e={$Process.Name}}
 echo                @{n='Memory';e={($Process.Group^|Measure WorkingSet -Sum^).Sum}}
 echo                ^)
 echo        $ProcArray += "" ^| select $prop  
 echo    }
 echo    $ProcArray ^| sort -Descending Memory ^| select Count,Name,@{n='Memory usage(Total^)';e={"$(($_.Memory).ToString('N0')) Kb"}}
)
Exit /B
REM -----------------------------------------------------------------------------