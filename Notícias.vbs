    Dim wshshell
    intOpcao = msgbox("Quer ver as noticias de hoje?",vbyesno,"NOTICIAS")
    if intOpcao = vbyes then
         Set WshShell = WScript.CreateObject("WScript.Shell")
    WshShell.Run("https://searx.be")
WshShell.Run("https://www.youtube.com/")
WshShell.Run("https://osint.link")
 WshShell.Run("https://www.sonoticiaboa.com.br")
    end if
