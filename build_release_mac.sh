npm run build;
rm -rf release-builds;
rm -rf dist;
electron-packager . --overwrite --platform=darwin --arch=x64 --icon=./icon.icns --prune=true --out=release-builds;
./node_modules/.bin/electron-builder --prepackaged "./release-builds/HoopSwagg Shipping-darwin-x64";