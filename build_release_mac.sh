npm run build;
rm -rf release-builds;
rm -rf dist;
electron-packager . --overwrite --platform=darwin --arch=x64 --icon=assets/icons/mac/icon.icns --prune=true --out=release-builds;
./node_modules/.bin/electron-builder --prepackaged ./release-builds/shipping-darwin-x64;