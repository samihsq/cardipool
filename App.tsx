import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import LandingScreen from "./src/screens/LandingScreen";
import NameScreen from "./src/screens/NameScreen";
import ContactScreen from "./src/screens/ContactScreen";
import ClassScreen from "./src/screens/ClassScreen";
import RoleScreen from "./src/screens/RoleScreen";
import MainScreen from "./src/screens/MainScreen";

export type RootStackParamList = {
  Landing: undefined;
  Name: undefined;
  Contact: undefined;
  Class: undefined;
  Role: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Landing"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Name" component={NameScreen} />
          <Stack.Screen name="Contact" component={ContactScreen} />
          <Stack.Screen name="Class" component={ClassScreen} />
          <Stack.Screen name="Role" component={RoleScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
