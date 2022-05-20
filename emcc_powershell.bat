powershell -NoExit cd path\to\emcc; Add-Content -path (Get-PSReadlineOption).HistorySavePath 'cls\; emcc path\to\cpp\file -o path\of\output\js\file -s USE_BOOST_HEADERS=1 -std=c++20 -lembind -g -sNO_DISABLE_EXCEPTION_CATCHING'
:: powershell -NoExit opens powershell without exiting after the command is complete
:: cd path\to\emcc opens the path to the emcc, not necessary if emsdk is activated latest is run with the --permanent flag (emsdk activate latest --permanent)
:: ; strings multiple powershell commands together
:: cls\; to clear the output of the previous compile, with the semicolon escaped with a backslash
:: Add-Content -path (Get-PSReadlineOption).HistorySavePath 'emcc path\to\cpp\file -o path\of\output\js\file -s USE_BOOST_HEADERS=1 -std=c++20 -lembind -g' adds the command to be run to the console history so that it can be run more easily