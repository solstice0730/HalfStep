module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.HALFSTEP_IOS_BUNDLE_IDENTIFIER || config.ios.bundleIdentifier
  }
});
