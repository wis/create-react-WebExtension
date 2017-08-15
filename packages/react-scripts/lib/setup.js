'use strict';

const url = require('url');
const fs = require('fs-extra');
const path = require('path');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const { loadBundles } = require('./bundle');

const processPublicFolder = (appPaths, hotUpdateUrl) => {
  fs.copySync(appPaths.appPublic, appPaths.appBuild, {
    dereference: true,
  });

  if (process.env.NODE_ENV === 'development') {
    setupHotUpdateSupport(appPaths, hotUpdateUrl);
  }
};

const setupHotUpdateSupport = (appPaths, hotUpdateUrl) => {
  if (process.env.NODE_ENV !== 'development') {
    throw 'Hot module reload is only supported in development.';
  }

  // Add hot update background scripts to the manifest file.
  const bgScriptRelPath = 'js/hot-update-background-script.js';
  const manifestInBuild = path.join(appPaths.appBuild, 'manifest.json');
  // We're requiring a json file that might have changed while we were "watching",
  // make sure we don't get a cached version.
  delete require.cache[require.resolve(appPaths.appManifest)];
  let manifest = require(appPaths.appManifest);
  manifest = injectBackgroundScript(manifest, bgScriptRelPath);
  manifest = injectHotUpdateHostPermission(manifest, hotUpdateUrl);
  fs.writeFileSync(manifestInBuild, JSON.stringify(manifest, null, 2));
};

const injectBackgroundScript = (manifest, bgScriptRelPath) => {
  manifest.background = manifest.background || {};
  manifest.background.scripts = manifest.background.scripts || [];
  if (!manifest.background.scripts.includes(bgScriptRelPath)) {
    manifest.background.scripts.push(bgScriptRelPath);
  }
  return manifest;
};

const injectHotUpdateHostPermission = (manifest, hotUpdateUrl) => {
  const { hostname } = url.parse(hotUpdateUrl);
  const requiredPermission = `*://${hostname}/*`;
  manifest.permissions = manifest.permissions || [];
  if (!manifest.permissions.includes(requiredPermission)) {
    manifest.permissions.push(requiredPermission);
  }
  return manifest;
};

const setupBuild = (appPaths, hotUpdateUrl) => {
  // Warn and crash if required files are missing.
  if (!checkRequiredFiles([appPaths.appManifest])) {
    process.exit(1);
  }

  fs.emptyDirSync(appPaths.appBuild);
  processPublicFolder(appPaths, hotUpdateUrl);
  return loadBundles(appPaths);
};

module.exports = {
  setupBuild,
  processPublicFolder,
};
