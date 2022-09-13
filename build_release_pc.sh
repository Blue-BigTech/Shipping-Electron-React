npm run build;
rm -rf release-builds;
rm -rf dist;
electron-packager . --overwrite --platform=win32 --arch=x64 --icon=./icon.icns --prune=true --out=release-builds;