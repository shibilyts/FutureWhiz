import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Vibration,
  TouchableOpacity,
  Image,
} from 'react-native';
import {accelerometer} from 'react-native-sensors';
import {map, filter, debounceTime} from 'rxjs/operators';
import {colors, responses} from './assets/data-set';
import Sound from 'react-native-sound';
import {
  BannerAd,
  TestIds,
  BannerAdSize,
  AppOpenAd,
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import {keys} from './assets/keys';
import * as Animatable from 'react-native-animatable';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initial = 'Please ask me something and shake your device!';
const windowHeight = Dimensions.get('window').height;
const adUnitIdBanner = __DEV__ ? TestIds.ADAPTIVE_BANNER : keys.adBannerKey;
const adUnitIdAppOpen = __DEV__ ? TestIds.APP_OPEN : keys.adAppOpenKey;
const adUnitIdInterstitial = __DEV__
  ? TestIds.INTERSTITIAL
  : keys.addInterstitial;

const interstitial = InterstitialAd.createForAdRequest(adUnitIdInterstitial, {
  keywords: ['fashion', 'clothing'],
});

function App(): React.JSX.Element {
  Sound.setCategory('Playback');
  const appOpenAd = AppOpenAd.createForAdRequest(adUnitIdAppOpen, {
    keywords: ['fashion', 'clothing', 'gaming'],
  });
  const backgroundStyle = {
    backgroundColor: '#000000',
  };
  const [response, setResponse] = useState('');
  const [fullRes, setFullRes] = useState('');
  const [shakeCount, setShakeCount] = useState(0);
  const [loadedInterstitial, setLoaded] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [shaking, setShaking] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  useEffect(() => {
    checkColor();
  }, []);

  const checkColor = async () => {
    setShaking(true);
    try {
      const value = await AsyncStorage.getItem('colorIndex');
      if (value !== null) {
        setColorIndex(+value);
      } else {
        const jsonValue = JSON.stringify(0);
        await AsyncStorage.setItem('colorIndex', jsonValue);
      }
    } catch (e) {
      // error reading value
    } finally {
      setShaking(false);
    }
  };
  useEffect(() => {
    setResponse('');
    renderResponseTextByText(initial);
    try {
      appOpenAd.load();
      setTimeout(() => {
        appOpenAd.show();
      }, 5000);
    } catch {}
  }, []);

  const renderResponseTextByText = (sentence: string) => {
    setResponse('');
    const characters = sentence.split('');
    let currentCharIndex = 0;
    let mouse = new Sound('mouse.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
    });

    const newIntervalId = setInterval(() => {
      if (currentCharIndex < characters.length) {
        const currentChar = characters[currentCharIndex];
        setResponse(prevText => prevText + currentChar);
        mouse.play();
        Vibration.vibrate(100);
        currentCharIndex++;
      } else {
        clearInterval(newIntervalId);
        mouse.release();
        setIntervalId(null);
      }
    }, 100);

    setIntervalId(newIntervalId);
  };
  useEffect(() => {
    const unsubscribe = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setLoaded(true);
      },
    );

    // Start loading the interstitial straight away
    interstitial.load();

    // Unsubscribe from events on unmount
    return unsubscribe;
  }, []);

  useEffect(() => {
    console.log('loadedInterstitial', loadedInterstitial, shakeCount);
    if (shakeCount > 0 && shakeCount % 3 === 0 && loadedInterstitial) {
      try {
        setShakeCount(0);
        setTimeout(() => {
          interstitial.show();
        }, 2000);
      } catch {}
    }
  }, [shakeCount, loadedInterstitial]);
  useEffect(() => {
    if (fullRes.length && fullRes.length === response.length) {
      setIntervalId(null);
    }
  }, [response, fullRes]);

  useEffect(() => {
    let dice = new Sound('dice.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
    });

    const subscriptionDice = accelerometer
      .pipe(
        map(({x, y, z}) => x + y + z),
        filter(speed => speed > 20),
      )
      .subscribe(speed => {
        if (intervalId === null && speed > 30) {
          setShaking(true);
          dice.play();
        }
      });

    const subscription = accelerometer
      .pipe(
        map(({x, y, z}) => x + y + z),
        filter(speed => speed > 30),
        debounceTime(1800),
      )
      .subscribe(speed => {
        if (intervalId === null && speed > 30) {
          setShaking(false);
          Vibration.vibrate(100);
          getResponse();
        }
      });

    return () => {
      subscription.unsubscribe();
      subscriptionDice.unsubscribe();
    };
  }, [intervalId]);

  const getResponse = () => {
    const shuffledResponses = [...responses].sort(() => Math.random() - 0.5);
    const randomResponse = `${shuffledResponses[0]}!`;
    setShakeCount(state => state + 1);
    setFullRes(randomResponse);
    renderResponseTextByText(randomResponse);
  };
  const shareApp = () => {
    let options = {
      message:
        'Check out this cool app I found! 🚀✨ Future Whiz is full of surprises. Download it now and join the fun!',
      title: 'Future Whiz',
      url: 'https://play.google.com/store/apps/details?id=com.futurewhiz',
    };
    Share.open(options)
      .then(res => {
        console.log(res);
      })
      .catch(err => {
        err && console.log(err);
      });
  };
  const changeColor = async (reset: boolean) => {
    let index = 0;
    if (colorIndex < colors.length - 1) {
      index = colorIndex + 1;
    }
    if (reset) {
      index = 0;
    }
    setColorIndex(index);
    const jsonValue = JSON.stringify(index);
    await AsyncStorage.setItem('colorIndex', jsonValue);
  };
  const themeColor = colors[colorIndex];
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={'light-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <View style={styles.container}>
        <View style={[styles.header, {borderBlockColor: themeColor}]}>
          <Text style={[styles.headerText, {color: themeColor}]}>
            Future Whiz
          </Text>
          <TouchableOpacity
            style={styles.shareTouch}
            onPress={() => shareApp()}>
            <Image
              style={[styles.shareImage, {tintColor: themeColor}]}
              source={require('./assets/images/share.png')}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fontColorTouch}
            onPress={() => changeColor(false)}
            onLongPress={() => changeColor(true)}>
            <Image
              style={[styles.fontColor, {tintColor: themeColor}]}
              source={require('./assets/images/fontColor.png')}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          {shaking ? (
            <Animatable.Image
              source={require('./assets/images/magicball.png')}
              style={styles.magicBall}
              animation="shake"
              iterationCount="infinite"
            />
          ) : (
            <Text style={[styles.responseText, {color: themeColor}]}>
              {response}
            </Text>
          )}
        </View>

        <View style={styles.bannerAddContainer}>
          {/* <BannerAd
            unitId={adUnitIdBanner}
            size={BannerAdSize.BANNER}
            onAdFailedToLoad={(e) => console.log('failed>>', e)}
          /> */}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
  },
  headerText: {
    fontSize: 20,
    fontFamily: 'Comtech',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: windowHeight - 200,
  },
  responseText: {
    fontSize: 28,
    fontFamily: 'Comtech',
    textAlign: 'center',
    paddingHorizontal: 30,
    maxHeight: 500,
  },
  fontColorTouch: {position: 'absolute', alignSelf: 'center', left: 10},
  fontColor: {
    width: 30,
    height: 30,
  },
  shareTouch: {position: 'absolute', alignSelf: 'center', right: 10},
  shareImage: {width: 30, height: 30},
  bannerAddContainer: {
    width: '100%',
    height: 65,
    position: 'absolute',
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  magicBall: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
});

export default App;
