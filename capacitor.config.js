const config = {
  appId: "br.edu.nenq.connect",
  appName: "NEnQ Connect",
  webDir: "build",
  server: {
    androidScheme: "https"
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

module.exports = config;
