D:\CHOCOLATE\NIRCMD\nircmd.exe 
wmic nicconfig where DHCPEnabled=TRUE call SetDNSServerSearchOrder ("9.9.9.9","149.112.112.112")
nircmd filldelete "C:\Users\User\Saved Games"
nircmd filldelete "C:\Users\User\3D Objects"
nircmd filldelete "C:\Users\User\Contacts"
nircmd filldelete "C:\Users\User\Links"
nircmd filldelete "C:\Users\User\Favorites"

echo @echo off > "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo del /s /f /q c:\windows\temp\*.* >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo rd /s /q c:\windows\temp >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo md c:\windows\temp >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo del /s /f /q C:\WINDOWS\Prefetch >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo del /s /f /q %temp%\*.* >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo rd /s /q %temp% >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo md %temp% >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\tempor~1 >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\temp >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\tmp >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\ff*.tmp >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\history >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\cookies >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\recent >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo deltree /y c:\windows\spool\printers >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo del c:\WIN386.SWP >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"
echo cls >> "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\tempclean.bat"

REM ----------------------------------------------------------------------------------------------------------
REM ### Visual performance options
REM ----------------------------------------------------------------------------------------------------------
	REM TITLE: Change Visual Effects Settings
			REM: OPTIONS: 0 (zero) for Let Windows choose what's best for my computer settings. 1 for Adjust for best appearance settings. 2 for Adjust for best Performance settings. 3 for Custom settings.
				REG ADD "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /V VisualFXSetting /t REG_DWORD /d 2 /F

@rem *** Remove Telemetry & Data Collection ***
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Device Metadata" /v PreventDeviceMetadataFromNetwork /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\MRT" /v DontOfferThroughWUAU /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\SQMClient\Windows" /v "CEIPEnable" /t REG_DWORD /d 0 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat" /v "AITEnable" /t REG_DWORD /d 0 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat" /v "DisableUAR" /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\WMI\AutoLogger\AutoLogger-Diagtrack-Listener" /v "Start" /t REG_DWORD /d 0 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\WMI\AutoLogger\SQMLogger" /v "Start" /t REG_DWORD /d 0 /f

@REM Change Windows Updates to "Notify to schedule restart"
reg add "HKLM\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" /v UxOption /t REG_DWORD /d 1 /f

REM *** Disable Suggestions in the Start Menu ***
reg add "HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SystemPaneSuggestionsEnabled" /t REG_DWORD /d 0 /f 

D:\Awesome.vbs

D:\CHOCOLATE\Offline.vbs

echo OFF

NET SESSION >nul 2>&1

IF %ERRORLEVEL% EQU 0 (

   echo.

) ELSE (

   echo.-------------------------------------------------------------

   echo EXECUTE COMO ADMINISTRADOR.

   echo. -------------------------------------------------------------

   echo. 

   pause

   echo.

   echo. Clique com o botao direito do mouse e selecione Executar como Administrador

   pause 

    echo.

   echo Pressione qualquer tecla para sair!

   pause

   EXIT /B 1

)

powershell -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"

choco feature enable -n=allowGlobalConfirmation

echo Chocolatey is ready to begin installing packages!

pause

@rem ----[ ADICIONE SEUS PROGRAMAS ABAIXO! ] ----

choco install 7zip.install --force
choco install bleachbit --force
choco install powershell-core --force
choco install wget --force
choco install firefox --force
choco install dotnetfx --force
choco install flashplayerplugin --force
choco install vlc --force
choco install git --force
choco install megasync --force
choco install chocolatey-core.extension --force
choco install anydesk.install --force
choco install chocolatey-dotnetfx.extension --force
choco install dotnet4.7 --force
choco install dotnet4.7.1 --force
choco install dotnet4.6 --force
choco install dotnet4.6.2 --force
choco install dotnet4.6.1 --force
choco install dotnet4.5 --force
choco install dotnet4.0 --force
choco install kodi --force
choco install dotnet3.5 --force
choco install chromium --force
choco install everything --force
choco install flashplayeractivex --force
choco install chocolatey-windowsupdate.extension --force
choco install adobeshockwaveplayer --force
choco install k-litecodecpackfull --force
choco install flameshot --force
choco install ccleaner --force
choco install protonvpn --force
choco install steam --force
choco install maltego --force
choco install nmap --force
choco install tcpdump --force
choco install wireshark --force
choco install audacity --force
choco install obs-studio --force
choco install openshot --force
choco install office365proplus --force
choco install librewolf --force
choco install keepass --force
choco install autohotkey --force
choco install tor --force
choco install torbrowser --force
choco install nextcloud-client --force
choco install notepadplusplus --force
choco install tinywall --force
choco install veracrypt --force
choco install adobereader --force
choco install imdisk --force
choco install httrack --force
choco install duplicati --force
choco install poweriso --force

@rem ---[Adicione quantos programas quiser!]----

pause
nircmd killprocess anydesk
nircmd killprocess protonvpn
nircmd.exe filldelete "C:\Users\Public\Saved Games"
nircmd filldelete "C:\Users\Public\3D Objects"
nircmd filldelete "C:\Users\Public\Contacts"
nircmd filldelete "C:\Users\Public\Links"
nircmd filldelete "C:\Users\Public\Favorites"
copy "C:\Users\User\Desktop\Flameshot.lnk" "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
del "C:\Users\User\Desktop\Flameshot.lnk"
del "C:\Users\User\Desktop\VeraCrypt.lnk"
cd C:\Program Files\CCleaner\
CCleaner64.exe /REGISTRY
@ECHO OFF
REM Detect the path of CCleaner
SET "U_=HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
SET "A_=CCleaner"
SET "M_=CCleaner IS NOT INSTALLED!!!"
FOR /f "delims=" %%a IN (
'REG QUERY "%U_%\%A_%" /v "UninstallString"2^>Nul^|FIND "REG_"') DO (
SET "CCleanerPath=%%a"&Call :Sub %%CCleanerPath:*Z=%%)
IF DEFINED CCleanerPath (%CCleanerPath% /S&&(
ECHO.&&ECHO:Uninstalling CCleaner...)) ELSE (ECHO:%M_%)
ECHO.&&PAUSE
:Sub
SET CCleanerPath=%*

control update

msconfig

systempropertiesremote

D:\CHOCOLATE\msg.vbs
nircmd killprocess "C:\Windows\System32\cmd.exe
exit()