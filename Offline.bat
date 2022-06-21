@echo off
D:\CHOCOLATE\any.exe /S /v/qn /w /norestart -y
D:\CHOCOLATE\emacs.exe
D:\CHOCOLATE\jre.exe  
msiexec.exe /i "D:\CHOCOLATE\power.msi" /QN
D:\CHOCOLATE\mega.exe
D:\CHOCOLATE\ccleaner.exe
D:\CHOCOLATE\bleach.exe
D:\CHOCOLATE\httrack.exe
D:\CHOCOLATE\idm.exe   
D:\CHOCOLATE\vera.exe  
D:\CHOCOLATE\obs.exe  
D:\CHOCOLATE\libre.exe  
D:\CHOCOLATE\steam.exe 
D:\CHOCOLATE\sandbox.exe 
D:\CHOCOLATE\ungoogled.exe 
D:\CHOCOLATE\super.exe 
D:\CHOCOLATE\vm.exe
D:\CHOCOLATE\kodi.exe  
D:\CHOCOLATE\defraggler.exe
D:\CHOCOLATE\zen.exe 
D:\CHOCOLATE\vs.exe 
D:\CHOCOLATE\Oracle\setup.exe
copy "D:\Checar Memória.lnk" "C:\Users\Public\Desktop\"
robocopy D:\CHOCOLATE\sqldeveloper\ C:\Program Files\ /E
copy "D:\CHOCOLATE\sqldeveloper\SQL.lnk" "C:\Users\Public\Desktop\"
copy "C:\Users\User\Desktop\Flameshot.lnk" "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\"
nircmd killprocess anydesk
msiexec.exe /i "D:\CHOCOLATE\keepass.msi"
msiexec.exe /i "D:\CHOCOLATE\next.msi"
msiexec.exe /i "D:\CHOCOLATE\duplicati.msi"  
D:\CHOCOLATE\nmap.exe 
D:\CHOCOLATE\7z.exe  
D:\CHOCOLATE\openshot.exe /S /v/qn /w /norestart -y
msiexec.exe /i "D:\CHOCOLATE\tiny.msi" 
D:\CHOCOLATE\firefox.exe /S /v/qn /w /norestart -y
D:\CHOCOLATE\media.exe /S /v/qn /w /norestart -y
D:\CHOCOLATE\wire.exe
D:\CHOCOLATE\ever.exe /S /v/qn /w /norestart -y 
msiexec.exe /i "D:\CHOCOLATE\flameshot.msi" /QN
del "C:\Users\Public\Desktop\Flameshot.lnk"
del "C:\Users\Public\Desktop\VeraCrypt.lnk"
msiexec.exe /i "D:\CHOCOLATE\shockwave.msi" 
msiexec.exe /i "D:\CHOCOLATE\chrome.msi" 
D:\CHOCOLATE\proton.exe 
nircmd killprocess protonvpn
D:\CHOCOLATE\air.exe 
D:\CHOCOLATE\winrar.exe
nircmd.exe win close title "WinRAR"
D:\CHOCOLATE\winrar.exe
D:\CHOCOLATE\jdk.exe
D:\FONTES.vbs 
copy "D:\CHOCOLATE\Notícias.vbs" "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\"
robocopy D:\CHOCOLATE\ghostwriter\ C:\Program Files\ /E
copy "D:\CHOCOLATE\ghostwriter\GhostWriter.lnk" "C:\Users\Public\Desktop\"
copy "D:\SecurityOps.lnk" "C:\Users\User\Desktop\"
robocopy D:\Wallpapers C:\Users\User\Pictures\Wallpapers\ /E
robocopy D:\SONGS C:\Users\User\Music\Songs\ /E
D:\Office\Setup64.exe 
nircmd killprocess "C:\Program Files\Common Files\microsoft shared\ClickToRun\OfficeC2RClient.exe
D:\CHOCOLATE\aio.exe /S /v/qn /w /norestart -y
pause
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
D:\CHOCOLATE\install.bat
nircmd killprocess cmd