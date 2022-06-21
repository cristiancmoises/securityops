   Dim wshshell
    intOpcao = msgbox("Instalar Programas Offline?",vbyesno,"SECURITY OPS V.3")
    if intOpcao = vbyes then
         Set WshShell = WScript.CreateObject("WScript.Shell")
 WshShell.Run("D:\CHOCOLATE\Offline.bat")
    end if