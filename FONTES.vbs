Const FONTS = &H14&

Set objShell = CreateObject("Shell.Application")
Set objFolder = objShell.Namespace(FONTS)
objFolder.CopyHere "D:\FONTES\*.ttf"
objFolder.CopyHere "D:\FONTES\*.otf"