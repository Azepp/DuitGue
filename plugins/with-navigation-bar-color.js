const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

const withNavigationBarColor = (config, { color } = {}) => {
  if (!color) return config;

  return withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'android:navigationBarColor',
      value: color,
    });
    return config;
  });
};

module.exports = withNavigationBarColor;
