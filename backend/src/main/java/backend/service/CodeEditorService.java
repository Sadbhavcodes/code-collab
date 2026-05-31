package backend.service;

import backend.dto.SocketMessage;
import backend.model.Room;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;

@Service
public class CodeEditorService {
    private final RoomService roomService;
    private ObjectMapper objectMapper = new ObjectMapper();
    public CodeEditorService(RoomService roomService) {
        this.roomService = roomService;
    }

    public void handleCodeChange(SocketMessage socketMessage,WebSocketSession session) throws IOException {
        System.out.println("Handling code changes...");
        Room room = roomService.getRoom(socketMessage.getRoomId());
        if(room == null) return;
        System.out.println("Saving code editor state...");
        room.setCodeEditorState(socketMessage.getCodeEditorState());

        broadcastToRoom(socketMessage,room,session);
    }
    public void broadcastToRoom(SocketMessage socketMessage, Room room, WebSocketSession sender)
            throws IOException {
        System.out.println("Broadcasting to room " + socketMessage.getRoomId() + ",to " + (room.getSessions().size() - 1 + " users"));
        SocketMessage response = new SocketMessage();
        response.setType("CODE-CHANGE");
        response.setRoomId(socketMessage.getRoomId());
        response.setCodeEditorState(room.getCodeEditorState());

        String jsonMessage = objectMapper.writeValueAsString(response);

        for(WebSocketSession s : room.getSessions()){
            if(s == sender){
                continue;
            }
            s.sendMessage(new TextMessage(jsonMessage));
        }
    }

}
