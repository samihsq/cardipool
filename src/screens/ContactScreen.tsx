import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Contact">;

export default function ContactScreen({ navigation }: Props) {
  const [contact, setContact] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Contact information</Text>
      <TextInput
        style={styles.input}
        placeholder="Email or Phone"
        keyboardType="email-address"
        value={contact}
        onChangeText={setContact}
      />
      <TouchableOpacity
        style={[styles.button, !contact && { opacity: 0.5 }]}
        disabled={!contact}
        onPress={() => navigation.navigate("Class")}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  question: {
    fontSize: 28,
    marginBottom: 16,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#9719dc",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
