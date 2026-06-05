package backend.model;

import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@lombok.Getter
@lombok.Setter
public class Room {
    private String roomId;
    private CodeEditorState codeEditorState;
    private List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private List<ChatMessage> messages = new CopyOnWriteArrayList<>();

    public Room(String roomId){
        this.roomId = roomId;
    }
}
