powershell -NoExit cd path\to\emcc; Add-Content -path (Get-PSReadlineOption).HistorySavePath 'emcc path\to\cpp\file -o path\of\output\js\file -s USE_BOOST_HEADERS=1 -std=c++17 -lembind'; emsdk_env.bat
:: powershell -NoExit opens powershell without exiting after the command is complete
:: cd path\to\emcc opens the path to the emcc, not necessary if emsdk is activated latest is run with the --permanent flag (emsdk activate latest --permanent)
:: ; strings multiple powershell commands together
:: Add-Content -path (Get-PSReadlineOption).HistorySavePath 'emcc path\to\cpp\file -o path\of\output\js\file -s USE_BOOST_HEADERS=1 -std=c++17 -lembind' adds the command to be run to the console history so that it can be run more easily
:: emsdk_env.bat enters the emsdk environment