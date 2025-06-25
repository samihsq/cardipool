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

type Props = NativeStackScreenProps<RootStackParamList, "Class">;

export default function ClassScreen({ navigation }: Props) {
  const [classYear, setClassYear] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Class year</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2025"
        keyboardType="numeric"
        value={classYear}
        onChangeText={setClassYear}
        maxLength={4}
      />
      <TouchableOpacity
        style={[styles.button, classYear.length !== 4 && { opacity: 0.5 }]}
        disabled={classYear.length !== 4}
        onPress={() => navigation.navigate("Role")}
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
