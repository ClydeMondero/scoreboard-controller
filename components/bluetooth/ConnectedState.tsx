import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { PeripheralServices } from "@/types/bluetooth";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

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
    <View className="flex-1 bg-[#282828] justify-center gap-8 py-4 px-4">
      {/* Jumpball Possession */}
      <View className="flex-col justify-center items-center mb-1">
        <Text className="text-white text-xs mb-1">BALL POSSESSION</Text>
        <AntDesign name="caretleft" size={28} color="#FFFFFF" />
      </View>

      {/* Score Section */}
      <View className="flex-row justify-around items-center mb-2">
        <View className="flex-1 items-center">
          <Text className="text-white text-base font-bold mb-2">HOME</Text>
          <Text className="text-yellow-400 text-7xl font-bold">300</Text>
        </View>

        <View className="flex-1 items-center gap-2">
          <Text className="text-white text-xs mb-1">PERIOD RUNNING</Text>
          <Text className="text-white text-2xl tracking-widest font-bold mb-2">
            45:00
          </Text>
          <Text className="text-red-500 text-6xl font-extrabold">24</Text>
          <Text className="text-white text-base mt-2">PERIOD 1</Text>
          <TouchableOpacity className="mt-2">
            <MaterialCommunityIcons
              name="bullhorn-variant"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center">
          <Text className="text-white text-base font-bold mb-2">GUEST</Text>
          <Text className="text-green-400 text-7xl font-bold">200</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View>
        <View className="flex-row justify-between mb-3">
          <TouchableOpacity className="bg-green-500 p-4 flex-1 mx-1 shadow-md">
            <Text className="text-white text-center text-xl font-bold">
              START
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-400 p-4 flex-1 mx-1 shadow-md">
            <Text className="text-white text-center text-xl font-bold">
              PAUSE
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mb-3">
          <TouchableOpacity className="bg-red-600 p-4 flex-1 mx-1 shadow-md">
            <Text className="text-white text-center text-lg font-bold">
              RESET
            </Text>
            <Text className="text-white text-center text-3xl font-bold">
              24
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-red-600 p-4 flex-1 mx-1 shadow-md">
            <Text className="text-white text-center text-lg font-bold">
              RESET
            </Text>
            <Text className="text-white text-center text-3xl font-bold">
              14
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mb-3">
          {["+1", "+2", "+3", "+1", "+2", "+3"].map((text, index) => (
            <TouchableOpacity
              key={index}
              className="bg-white p-3 flex-1 mx-1 shadow-md"
            >
              <Text
                className={`text-center text-xl font-bold ${
                  index < 3 ? "text-yellow-500" : "text-green-500"
                }`}
              >
                {text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row justify-between mb-3">
          <TouchableOpacity className="bg-white p-3 flex-1 mx-1 shadow-md">
            <Text className="text-yellow-500 text-center text-xl font-bold">
              -1
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white p-3 flex-1 mx-1 shadow-md">
            <Text className="text-green-500 text-center text-xl font-bold">
              -1
            </Text>
          </TouchableOpacity>
        </View>

        {/* Home / Guest Bottom Navigation */}
        <View className="flex-row justify-between ">
          <TouchableOpacity className="bg-yellow-500 p-4 flex-1 mx-1 shadow-md">
            <Text className="text-white text-center text-xl font-bold">
              HOME
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-green-500 p-4 flex-1 mx-1 shadow-md">
            <Text className="text-white text-center text-xl font-bold">
              GUEST
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ConnectedState;
