package backend.model;

import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;

@lombok.Getter
@lombok.Setter
public class Room {
    private String roomId;
    private List<WebSocketSession> sessions = new ArrayList<>();
    private List<ChatMessage> messages = new ArrayList<>();

    public Room(String roomId){
        this.roomId = roomId;
    }
}
