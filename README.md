## Build Instructions

**Make sure all dependices are installed**
`npm i --save`

**Mac**

1. change isDev to false in app.js
2. change .env variables to correct ones
3. build react
   `npm run build`
4. delete release-builds and dist in root
5. run package for darwin command
   `electron-packager . --overwrite --platform=darwin --arch=x64 --icon=assets/icons/mac/icon.icns --prune=true --out=release-builds`
6. packed application into dist folder
   `./node_modules/.bin/electron-builder --prepackaged ./release-builds/HoopSwagg\ Shipping-darwin-x64`
7. final packaged dmg executable will be in dist folder

**Windows**

1. change isDev to false in app.js
2. change .env variables to correct ones
3. build react
   `npm run build`
4. delete release-builds and dist in root
5. run package for win32 command
   `electron-packager . --overwrite --platform=win32 --arch=x64 --icon=assets/icons/mac/icon.icns --prune=true --out=release-builds`
6. folder is large, and will take a while to move, but move the folder ./release-builds/shipping-win32-x64 to the PC
