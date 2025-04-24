import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Turf - Login" }}
        initialParams={{ setUserToken, setUserInfo }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Turf - Register" }}
        initialParams={{ setUserToken, setUserInfo }}
      />
    </Stack.Navigator>
  );
};

export default App; 