import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    StyleSheet,
    Image,
    BackHandler
} from 'react-native';
import {
    EventType,
    useZoom,
    ZoomVideoSdkUser,
    Errors,
} from '@zoom/react-native-videosdk';
import { navigate } from './customNavigator';
import { icons } from './assets';
import { units, fonts } from './theme';


export function CallScreen({ extraData, navigation }) {

    const { params } = extraData
    const zoom = useZoom();

    const [isInSession, setIsInSession] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                await zoom.joinSession({
                    sessionName: params.channel,
                    sessionPassword: "",
                    token: params.token,
                    userName: "attendee",
                    audioOptions: {
                        connect: true,
                        mute: false,
                    },
                    videoOptions: {
                        localVideoOn: false,
                    },
                    sessionIdleTimeoutMins: 60,
                });
            } catch (e) {
                Alert.alert('Failed to start the call');
                setTimeout(() => navigate(params.mainScreen), 1000);
            }
        })();
    }, []);

    useEffect(() => {
        const sessionJoinListener = zoom.addListener(
            EventType.onSessionJoin,
            async () => {
                setIsInSession(true);
                const mySelf = await zoom.session.getMySelf();
                zoom.audioHelper.setSpeaker(false);
                zoom.audioHelper.unmuteAudio(mySelf.userId);
            }
        );

        const sessionLeaveListener = zoom.addListener(
            EventType.onSessionLeave,
            endCall
        );

        const userAudioStatusChangedListener = zoom.addListener(
            EventType.onUserAudioStatusChanged,
            async () => {
                const mySelf = new ZoomVideoSdkUser(
                    await zoom.session.getMySelf()
                );
                mySelf.audioStatus.isMuted().then((muted) => setIsMuted(muted));
            }
        );

        const eventErrorListener = zoom.addListener(
            EventType.onError,
            async (error) => {
                console.log('Error: ' + JSON.stringify(error));
                switch (error.errorType) {
                    case Errors.SessionJoinFailed:
                        Alert.alert('Failed to start the call');
                        setTimeout(() => navigate(params.mainScreen), 1000);
                        break;
                    default:
                }
            }
        );

        return () => {
            sessionJoinListener.remove();
            sessionLeaveListener.remove();
            userAudioStatusChangedListener.remove();
            eventErrorListener.remove();
        };
    }, [zoom, extraData]);


    const toggleMicrophone = async () => {
        const mySelf = await zoom.session.getMySelf();
        isMuted
            ? zoom.audioHelper.unmuteAudio(mySelf.userId)
                .then(() => setIsMuted(false))
            : zoom.audioHelper.muteAudio(mySelf.userId)
                .then(() => setIsMuted(true))
    };

    const toggleSpeaker = async () => {
        await engine.setEnableSpeakerphone(!isSpeakerOn)
            .then(() => setIsSpeakerOn(!isSpeakerOn));
    };

    const endCall = async () => {
        setIsInSession(false);
        zoom.leaveSession(false);
        navigation.pop()
        navigate(params.mainScreen);
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                return true
            })
        return () => backHandler.remove()
    }, [])

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar hidden />
            <Text style={styles.callerText}>
                {params.callerName}
            </Text>
            <View style={styles.iconsWrapper}>
                <TouchableOpacity onPress={toggleMicrophone}>
                    <Image
                        source={isMuted ? icons.unmute : icons.mute}
                        style={styles.smallIcon}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={endCall}>
                    <Image
                        source={icons.endCall}
                        style={styles.largeIcon}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleSpeaker}>
                    <Image
                        source={isSpeakerOn ? icons.speakerOff : icons.speakerOn}
                        style={styles.smallIcon}
                    />
                </TouchableOpacity>
            </View>
            {!isInSession ?
                <View style={styles.connectingWrapper}>
                    <Text style={styles.connectingText}>Connecting...</Text>
                </View>
                :
                null
            }
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },
    callerText: {
        flex: 3,
        fontSize: fonts(36),
        marginTop: units.height / 18,
        alignSelf: 'center',
        color: '#333333'
    },
    iconsWrapper: {
        flex: 1.5,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: "center",
    },
    smallIcon: {
        height: units.height / 11,
        width: units.height / 11
    },
    largeIcon: {
        height: units.height / 9,
        width: units.height / 9,
    },
    connectingWrapper: {
        position: 'absolute',
        width: "100%",
        height: "100%",
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF'
    },
    connectingText: {
        fontSize: fonts(24),
        fontWeight: 'bold',
        color: '#000000'
    }
});
