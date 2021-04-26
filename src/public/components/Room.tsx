import React, { useEffect, useState } from 'react';
import Video, { Participant as TwilioParticipant } from 'twilio-video';
import Participant from './Participant';

interface Props {
    roomName: string;
    twilioToken: string;
}

// https://www.twilio.com/blog/video-chat-react-hooks
const Room = (props: Props) => {
    const { roomName, twilioToken } = props;
    const [room, setRoom] = useState<Video.Room | null>(null);
    const [participants, setParticipants] = useState<TwilioParticipant[]>([]);

    useEffect(() => {
        let room: Video.Room;
        const start = async () => {
            const participantConnected = (participant: TwilioParticipant) => {
                if (participant.identity.indexOf('recording') === -1) {
                    setParticipants(prevParticipants => [
                        ...prevParticipants,
                        participant,
                    ]);
                }
            };

            const participantDisconnected = (participant: TwilioParticipant) => {
                setParticipants(prevParticipants =>
                    prevParticipants.filter(p => p !== participant),
                );
            };

            room = await Video.connect(twilioToken as string, {
                name: roomName,
                tracks: [],
            });
            setRoom(room);
            room.on('participantConnected', participantConnected);
            room.on('participantDisconnected', participantDisconnected);
            room.participants.forEach(participantConnected);
        };
        start();
        return () => {
            if (room && room.localParticipant.state === 'connected') {
                room.disconnect();
            }
        };
        // eslint-disable-next-line
    }, []);

    if (!room) {
        return null;
    }

    return (
        <div style={styles.container}>
            {participants.map((participant) => (
                <Participant participant={participant} />
            ))}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flex: 1,
        flexDirection: 'row' as 'row',
    },
};

export default Room;
