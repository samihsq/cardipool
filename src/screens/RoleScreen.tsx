import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Role">;

const options = ["Looking for rides", "Offering rides"];

export default function RoleScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.question}>What are you looking for?</Text>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.option, selected === opt && styles.optionSelected]}
          onPress={() => setSelected(opt)}
        >
          <Text
            style={[
              styles.optionText,
              selected === opt && styles.optionTextSelected,
            ]}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.button, !selected && { opacity: 0.5 }]}
        disabled={!selected}
        onPress={() => navigation.navigate("Main")}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
  option: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: "#9719dc",
    borderColor: "#9719dc",
  },
  optionText: {
    fontSize: 18,
    color: "#333",
  },
  optionTextSelected: {
    color: "white",
  },
  button: {
    marginTop: 24,
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
