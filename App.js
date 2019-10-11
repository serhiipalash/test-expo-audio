import React from 'react'
import { StyleSheet, Text, View, Button, Alert } from 'react-native'
import { Audio } from 'expo-av'
import Slider from './react-native-slider'

const thumbTouchSize = { width: 50, height: 50 }

export default class App extends React.Component {
  state = {
    seek: 0,
    volume: 1,
    isLoaded: false,
    isBuffering: true,
    duration: undefined,
  }

  _isInitialBufferingStarted = false
  _isInitialBufferingEnded = false

  render() {
    const {
      isPlaying,
      initialLoadingTimestamp,
      initialBufferingTimestamp,
      initialPlayingTimestamp,
    } = this.state

    return (
      <View style={styles.container}>
        {initialLoadingTimestamp ? (
          <Text>Loaded {initialLoadingTimestamp} ms</Text>
        ) : null}

        {initialBufferingTimestamp ? (
          <Text>Buffered {initialBufferingTimestamp} ms</Text>
        ) : null}

        {initialPlayingTimestamp ? (
          <Text>Playing {initialPlayingTimestamp} ms</Text>
        ) : null}

        <Slider
          style={styles.slider}
          thumbStyle={styles.thumb}
          trackStyle={styles.track}
          thumbTouchSize={thumbTouchSize}
          onValueChange={this._onSeekChange}
          value={this._getSeekSliderPosition()}
          onSlidingComplete={this._onSeekComplete}
          minimumTrackTintColor="rgb(64, 224, 190)"
        />

        {isPlaying ? (
          <Button title="Pause" onPress={this._pause} />
        ) : (
          <Button title="Play" onPress={this._play} />
        )}
      </View>
    )
  }

  _play = async () => {
    if (!this.soundObject) {
      this.timestamp = Date.now()

      const { sound } = await Audio.Sound.createAsync(
        {
          uri: 'https://media.acast.com/mamapodden/10.markiztainton/media.mp3',
        },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 800,
          positionMillis: 0,
        },
        this._onPlaybackStatusUpdate
      )

      this.soundObject = sound
    } else {
      this.timestamp = Date.now()

      this.soundObject.playAsync()
    }
  }

  _pause = () => this.soundObject.pauseAsync()

  _onPlaybackStatusUpdate = status => {
    const statusTimestamp = Date.now() - this.timestamp

    console.info('status ' + statusTimestamp + ': ', status)

    if (this._prevStatus && !this._prevStatus.isLoaded && status.isLoaded) {
      this.setState({ initialLoadingTimestamp: statusTimestamp })
    }

    if (!this._isInitialBufferingStarted) {
      if (status.isBuffering) {
        this._isInitialBufferingStarted = true
      }
    } else if (!this._isInitialBufferingEnded && !status.isBuffering) {
      this.setState({ initialBufferingTimestamp: statusTimestamp })

      this._isInitialBufferingEnded = true
    }

    if (
      !this.state.initialPlayingTimestamp &&
      this._prevStatus &&
      !this._prevStatus.isPlaying &&
      status.isPlaying
    ) {
      this.setState({ initialPlayingTimestamp: statusTimestamp })
    }

    this._prevStatus = status

    if (status.isLoaded) {
      this.setState({
        duration: getMMSSFromMillis(status.durationMillis),
        volume: status.volume,
        isLoaded: status.isLoaded,
        isPlaying: status.isPlaying,
        playbackInstancePosition: status.positionMillis,
        playbackInstanceDuration: status.durationMillis,
      })
    } else if (status.error) {
      console.log('Status error', status.error)
    }
  }

  _onSeekChange = async value => {
    if (this.soundObject != null) {
      if (!this.isSeeking) {
        this.isSeeking = true
      }
      this.seek = value
    }
  }

  _onSeekComplete = async value => {
    if (this.soundObject != null) {
      this.timestamp = Date.now()

      await this.soundObject.setStatusAsync({
        positionMillis: value * this.state.playbackInstanceDuration,
      })

      this.isSeeking = false
    }
  }

  _getSeekSliderPosition = () => {
    if (this.isSeeking) {
      return this.seek
    }

    const { playbackInstancePosition, playbackInstanceDuration } = this.state

    if (
      this.soundObject != null &&
      playbackInstancePosition != null &&
      playbackInstanceDuration != null
    ) {
      return playbackInstancePosition / playbackInstanceDuration
    }

    return 0
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(249,250,252)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  slider: {
    alignSelf: 'center',
    width: 315,
    bottom: 0,
  },

  thumb: {
    backgroundColor: 'rgb(255 ,255 ,255)',
    shadowColor: 'rgba(0,0,0,0.18)',
    shadowOffset: { height: 10, width: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  track: {
    backgroundColor: 'rgb(235, 235, 235)',
  },
})

function getMMSSFromMillis(millis) {
  const totalSeconds = millis / 1000
  const seconds = Math.floor(totalSeconds % 60)
  const minutes = Math.floor(totalSeconds / 60)

  return padWithZero(minutes) + ':' + padWithZero(seconds)

  function padWithZero(number) {
    const string = number.toString()

    if (number < 10) {
      return '0' + string
    }

    return string
  }
}
