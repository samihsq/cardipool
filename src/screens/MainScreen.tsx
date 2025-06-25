import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const dummyRides = [
  { id: "1", title: "Ride from Campus to SFO - Friday 3pm" },
  { id: "2", title: "Need carpool to Palo Alto Caltrain" },
  { id: "3", title: "Offering ride to San Jose Saturday 10am" },
];

export default function MainScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cardipool</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {}}>
          <Feather name="plus" size={24} color="white" />
          <Text style={styles.addButtonText}>Add Request</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={dummyRides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.rideItem}>
            <Text style={styles.rideText}>{item.title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#9719dc",
  },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "700" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6e0cc4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: { color: "white", marginLeft: 4, fontWeight: "600" },
  listContent: { padding: 16 },
  rideItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  rideText: { fontSize: 16 },
});
