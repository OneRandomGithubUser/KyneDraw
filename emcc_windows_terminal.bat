wt -d path\to\emcc powershell -NoExit Add-Content -path (Get-PSReadlineOption).HistorySavePath 'emcc path\to\cpp\file -o path\of\output\js\file -s USE_BOOST_HEADERS=1 -std=c++20 -lembind -g' \; .\emsdk_env.bat
:: wt -d path\to\emcc opens Windows Terminal at the directory of emcc, "-d path\to\emcc" is not necessary if emsdk is activated latest is run with the --permanent flag (emsdk activate latest --permanent)
:: powershell -NoExit opens Powershell within Windows Terminal without exiting after the command is complete 
:: Add-Content -path (Get-PSReadlineOption).HistorySavePath 'emcc path\to\cpp\file -o path\of\output\js\file -s USE_BOOST_HEADERS=1 -std=c++20 -lembind -g' adds the command to be run to the console history so that it can be run more easily
:: \; strings multiple powershell commands together, properly escaped so that Windows Terminal doesn't run them in separate windows
:: emsdk_env.bat enters the emsdk environment