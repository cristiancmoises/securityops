    Dim wshshell
    intOpcao = msgbox("Deseja Remover Os Bloatwares?",vbyesno,"Removedor de Bloatwares")
    if intOpcao = vbyes then
         Set WshShell = WScript.CreateObject("WScript.Shell")
 WshShell.Run("D:\awesome.bat")
    end if