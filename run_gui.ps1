$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
$env:PYTHONIOENCODING = "utf-8"
Set-Location $PSScriptRoot
python -m src.gui
