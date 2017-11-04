import React, { Component } from 'react';
import FCM, {FCMEvent, RemoteNotificationResult, WillPresentNotificationResult, NotificationType} from 'react-native-fcm';
import { StackNavigator, DrawerNavigator, NavigationActions } from 'react-navigation';
import {
  AppRegistry,
  Text,
  View,
  Platform,
  TouchableHighlight
} from 'react-native';
import Dimensions from 'Dimensions'
import { Provider, connect } from 'react-redux'
import { createStore, combineReducers } from 'redux'
var {width, height} = Dimensions.get('window')

const prefix = Platform.OS == 'android' ? 'dlpm://dlpm/' : 'dlpm://'

var style = {width, height, alignItems: 'center', justifyContent: 'center'}

class HomeScreen extends Component {
  componentDidMount() {
    const { navigate, dispatch } = this.props.navigation;
    setTimeout(() => {
      var potentialAction = this.props.screenProps.getCorrectScreenTransition()
      if (potentialAction) {
        dispatch(potentialAction)
      }
    }, 100)
  }
  render() {
    var {navigate} = this.props.navigation
    return (
      <View style={style}>
        <Text>HomeScreen</Text>
        <TouchableHighlight onClick={() => {
            navigate('AppDrawer')
          }}>
          <Text>Go to DrawerNavigator</Text>
        </TouchableHighlight>
      </View>
    )
  }
}

class Drawer1Screen1Screen extends Component {
  render() {
    var {navigate} = this.props.navigation
    return (
      <View style={style}>
        <TouchableHighlight onClick={() => {
            navigate('Drawer1Screen2')
          }}>
          <Text>Go to Screen 2</Text>
        </TouchableHighlight>
      </View>
    )
  }
}

class Drawer1Screen2Screen extends Component {
  render() {
    var {navigate} = this.props.navigation
    return (
      <View style={style}>
        <TouchableHighlight onClick={() => {
            navigate('Drawer1Screen3')
          }}>
          <Text>Go to Screen 3</Text>
        </TouchableHighlight>
      </View>
    )
  }
}

class Drawer1Screen3Screen extends Component {
  render() {
    var {navigate} = this.props.navigation
    return (
      <View style={style}>
        <Text>on screen three</Text>
      </View>
    )
  }
}

const Drawer1Screen = StackNavigator({
  Drawer1Screen1: {screen: Drawer1Screen1Screen, path: 'screen-1'},
  Drawer1Screen2: {screen: Drawer1Screen2Screen, path: 'screen-2'},
  Drawer1Screen3: {screen: Drawer1Screen3Screen, path: 'screen-3'}
})

class Drawer2Screen extends Component {
  render() {
    return (
      <View style={style}>
        <Text>Only a screen, not a nested stack navigator</Text>
      </View>
    )
  }
}

const UserNavigator = DrawerNavigator({
  Drawer1: {screen: Drawer1Screen, path: 'drawer-1' },
  Drawer2: {screen: Drawer2Screen, path: 'drawer-2' }
})

class LoginScreen extends Component {
  render() {
    return (
      <View style={style}>
        <Text>LoginScreen</Text>
      </View>
    )
  }
}

const DeepLinkFromPushNotification = StackNavigator({
  Home: { screen: HomeScreen },
  Users: { screen: UserNavigator, path: 'users' },
  Login: { screen: LoginScreen, path: 'login' }
}, {mode: "modal"});

const initialState = DeepLinkFromPushNotification.router.getStateForAction(DeepLinkFromPushNotification.router.getActionForPathAndParams('Home'))
const navReducer = (state = initialState, action) => {
  const nextState = DeepLinkFromPushNotification.router.getStateForAction(action, state)

  // Simply return the original `state` if `nextState` is null or undefined.
  return nextState || state
}

const appReducer = combineReducers({
  nav: navReducer
})

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      deepLink: false
    }
  }
  componentDidMount() {
    setTimeout(() => {
      if (Platform.OS === 'ios') {
        FCM.requestPermissions().then(() => {
          // accepted
        }).catch(() => {
          // rejected push notification permission
        });
      }
    }, 250);
    FCM.getInitialNotification().then(notif => {
      if (notif && notif.payload && notif.payload.openURL) {
        this.setState({deepLink: notif.payload.openURL, deepLinkPayload: notif.payload})
      } else {
        var data = { foo: 'bar' }
        console.warn("scheduling it now!!")
        FCM.scheduleLocalNotification({
          fire_date: new Date().getTime() + 8000,
          id: "UNIQ_ID_STRING",
          body: "This is a local push notification!",
          payload: {
            openURL: "users/drawer-1/screen-1/screen-2/screen-3",
            data: data
          },
          show_in_foreground: true
        })
      }
    })
    FCM.on(FCMEvent.Notification, async (notif) => {
      if (Platform.OS ==='ios') {
        switch(notif._notificationType){
          case NotificationType.Remote:
            notif.finish(RemoteNotificationResult.NewData) //other types available: RemoteNotificationResult.NewData, RemoteNotificationResult.ResultFailed
            break;
          case NotificationType.NotificationResponse:
            notif.finish();
            break;
          case NotificationType.WillPresent:
            notif.finish(WillPresentNotificationResult.All) //other types available: WillPresentNotificationResult.None
            break;
        }
      }
    })
  }
  render() {
    var {deepLink} = this.state
    var sampleScreenProp1 = 'sampleScreenProp1'
    var sampleScreenProp2 = 'sampleScreenProp2'
    return (
      <DeepLinkFromPushNotification
        uriPrefix={prefix}
        screenProps={{
          sampleScreenProp1,
          sampleScreenProp2,
          getCorrectScreenTransition: () => {
            if (deepLink) {
              return NavigationActions.navigate({
                routeName: 'Users',
                action: NavigationActions.navigate({
                  routeName: 'Drawer1',
                  action: NavigationActions.navigate({
                    routeName: 'Drawer1Screen2',
                    action: NavigationActions.navigate({
                      routeName: 'Drawer1Screen3',
                    })
                  })
                })
              })
            } else {
              // not from a deep link
            }
          }
        }} />
    )
  }
}

const mapStateToProps = (state) => ({
  nav: state.nav
})

const AppWithNavigationState = connect(mapStateToProps)(App)

const store = createStore(appReducer);

class Root extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <AppWithNavigationState />
      </Provider>
    );
  }
}

export default Root
