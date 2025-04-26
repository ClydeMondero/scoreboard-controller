import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React from "react";
import { PeripheralServices } from "@/types/bluetooth";

interface ConnectedStateProps {
  bleService: PeripheralServices | undefined;
  onRead: () => void;
  onWrite: () => void;
  onDisconnect: (id: string | undefined) => void;
}

const ConnectedState: React.FunctionComponent<ConnectedStateProps> = ({
  bleService,
  onDisconnect,
  onRead,
  onWrite,
}) => {
  return (
    <View style={styles.container}>
      {/* Score Section */}
      <View style={styles.scoreSection}>
        <View style={styles.teamBlock}>
          <Text style={styles.teamLabel}>HOME</Text>
          <Text style={styles.score}>00</Text>
          <Text style={styles.subInfo}>FOULS 0</Text>
          <Text style={styles.subInfo}>TIMEOUTS 2</Text>
        </View>

        <View style={styles.centerBlock}>
          <Text style={styles.pressStart}>PRESS START</Text>
          <Text style={styles.timer}>10:00</Text>
          <Text style={styles.shotClock}>24</Text>
          <Text style={styles.period}>PERIOD 1</Text>
        </View>

        <View style={styles.teamBlock}>
          <Text style={styles.teamLabel}>AWAY</Text>
          <Text style={styles.score}>00</Text>
          <Text style={styles.subInfo}>FOULS 0</Text>
          <Text style={styles.subInfo}>TIMEOUTS 2</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlSection}>
        <View style={styles.row}>
          <TouchableOpacity style={styles.scoreButton}>
            <Text style={styles.buttonText}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.buttonText}>START</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scoreButton}>
            <Text style={styles.buttonText}>+1</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.scoreButton}>
            <Text style={styles.buttonText}>-1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pauseButton}>
            <Text style={styles.buttonText}>PAUSE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scoreButton}>
            <Text style={styles.buttonText}>-1</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.resetButton}>
            <Text style={styles.buttonText}>RESET 24</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton}>
            <Text style={styles.buttonText}>RESET 14</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.foulButton}>
            <Text style={styles.buttonText}>-F</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.foulButton}>
            <Text style={styles.buttonText}>+F</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.foulButton}>
            <Text style={styles.buttonText}>+F</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.foulButton}>
            <Text style={styles.buttonText}>-F</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Home / Away Bottom Navigation */}
      <View style={styles.navSection}>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.buttonText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.buttonText}>AWAY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ConnectedState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamBlock: {
    alignItems: "center",
    flex: 1,
  },
  teamLabel: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 4,
  },
  score: {
    color: "#00f",
    fontSize: 48,
    fontWeight: "bold",
  },
  subInfo: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
  centerBlock: {
    alignItems: "center",
    flex: 1,
  },
  pressStart: {
    color: "#0f0",
    fontSize: 14,
    marginBottom: 4,
  },
  timer: {
    color: "#ff0",
    fontSize: 36,
    fontWeight: "bold",
  },
  shotClock: {
    color: "#f00",
    fontSize: 48,
    fontWeight: "bold",
    marginTop: 4,
  },
  period: {
    color: "#fff",
    fontSize: 16,
    marginTop: 4,
  },
  controlSection: {
    marginTop: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  scoreButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: "green",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  pauseButton: {
    backgroundColor: "gray",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  resetButton: {
    backgroundColor: "maroon",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  foulButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 2,
  },
  navSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  navButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
