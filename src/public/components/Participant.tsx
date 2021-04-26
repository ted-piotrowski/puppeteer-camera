import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { Participant as TwilioParticipant, RemoteTrack, RemoteTrackPublication } from 'twilio-video';

interface Props {
    participant: TwilioParticipant;
    style?: CSSProperties;
}

// https://www.twilio.com/blog/video-chat-react-hooks
const Participant = (props: Props) => {
    const { participant, style } = props;
    const [tracks, setTracks] = useState<RemoteTrack[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [audioTrack, setAudioTrack] = useState<MediaStreamTrack>();

    useEffect(() => {
        const trackSubscribed = (track: RemoteTrack) => {
            setTracks(tracks => [...tracks, track]);
        };

        const trackUnsubscribed = (track: RemoteTrack) => {
            setTracks(tracks => tracks.filter(v => v !== track));
        };

        const trackPublished = (publication: RemoteTrackPublication) => {
            publication.on('subscribed', trackSubscribed);
            publication.on('unsubscribed', trackUnsubscribed);
            if (publication.isSubscribed && publication.track !== null) {
                trackSubscribed(publication.track);
            }
        };

        const trackUnpublished = (publication: RemoteTrackPublication) => {
            if (publication.track) {
                trackUnsubscribed(publication.track);
            }
        };

        participant.on('trackPublished', trackPublished);
        participant.on('trackUnpublished', trackUnpublished);
        participant.tracks.forEach(trackPublication =>
            trackPublished(trackPublication as RemoteTrackPublication),
        );

        return () => {
            setTracks([]);
            participant.removeAllListeners();
        };
    }, [participant]);

    useEffect(() => {
        tracks.forEach(track => {
            if (track.kind === 'video' && videoRef.current !== null) {
                track.attach(videoRef.current as HTMLVideoElement);
            } else if (track.kind === 'audio' && audioRef.current !== null) {
                track.attach(audioRef.current as HTMLAudioElement);
                setAudioTrack(track.mediaStreamTrack);
            }
        });
        return () => {
            tracks.forEach((track: any) => track.detach());
        };
    }, [tracks]);

    const videoOn = tracks.filter(track => track.kind === 'video').length > 0;

    return (
        <div style={{ flex: videoOn ? 1 : 0 }}>
            <div style={styles.videoContainer}>
                {tracks.filter(track => track.kind === 'video').length > 0 ? (
                    <video
                        ref={videoRef}
                        autoPlay={true}
                        style={styles.video}
                        muted={true}
                    />
                ) : (
                        participant.identity
                    )}
            </div>
            <audio ref={audioRef} autoPlay={true} />
            {/* <div style={styles.identity}>{user && user.id}</div> */}
        </div>
    );
};

const styles = {
    videoContainer: {
        height: `calc(100vh)`,
        width: '100%',
        backgroundColor: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        maxHeight: `calc(100vh)`,
        width: '100%',
        backgroundColor: 'black',
    },
    identity: {
        position: 'absolute',
        top: 0,
        left: 0,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,.7)',
        color: 'white',
        minWidth: 100,
        justifyContent: 'center',
        display: 'flex',
        borderBottomRightRadius: 10,
        alignItems: 'center',
    }
}

export default Participant;
