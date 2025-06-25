import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { StatusBar } from "expo-status-bar";

type Props = NativeStackScreenProps<RootStackParamList, "Landing">;

export default function LandingScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Cardipool</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Name")}
      >
        <Text style={styles.buttonText}>Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#9719dc",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 42,
    color: "white",
    marginBottom: 32,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "white",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#9719dc",
    fontSize: 18,
    fontWeight: "600",
  },
});
