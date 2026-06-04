package backend.service;

import backend.dto.SocketMessage;
import backend.model.CodeEditorState;
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

    public void handleYjsUpdate(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        System.out.println("Handling Yjs update for room: " + socketMessage.getRoomId());
        System.out.println("   sender: " + socketMessage.getSender());
        System.out.println("   update length: " + (socketMessage.getUpdate() != null ? socketMessage.getUpdate().length() : 0));
        System.out.println("   code length: " + (socketMessage.getCode() != null ? socketMessage.getCode().length() : 0));
        Room room = roomService.getRoom(socketMessage.getRoomId());
        if (room == null) return;

        if (socketMessage.getCode() != null) {
            if (room.getCodeEditorState() == null) {
                room.setCodeEditorState(new CodeEditorState());
            }
            room.getCodeEditorState().setCode(socketMessage.getCode());
        }

        SocketMessage response = new SocketMessage();
        response.setType("YJS_UPDATE");
        response.setRoomId(socketMessage.getRoomId());
        response.setSender(socketMessage.getSender());
        response.setUpdate(socketMessage.getUpdate());
        response.setCode(socketMessage.getCode());

        String jsonMessage = objectMapper.writeValueAsString(response);
        int sent = 0;
        for (WebSocketSession s : room.getSessions()) {
            if (s == session || !s.isOpen()) {
                continue;
            }
            synchronized (s) {
                try {
                    s.sendMessage(new TextMessage(jsonMessage));
                    sent++;
                } catch (IllegalStateException e) {
                    System.out.println("Failed to send YJS_UPDATE to session " + s.getId() + ": " + e.getMessage());
                }
            }
        }
        System.out.println("   broadcast sent to " + sent + " peer(s)");
    }

    public void handleCursorMove(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        System.out.println("Handling cursor move...");
        Room room = roomService.getRoom(socketMessage.getRoomId());
        if (room == null) return;

        SocketMessage response = new SocketMessage();
        response.setType("CURSOR_MOVE");
        response.setRoomId(socketMessage.getRoomId());
        response.setSender(socketMessage.getSender());
        response.setUsername(socketMessage.getUsername());
        response.setLineNumber(socketMessage.getLineNumber());
        response.setColumn(socketMessage.getColumn());

        String jsonMessage = objectMapper.writeValueAsString(response);
        for (WebSocketSession s : room.getSessions()) {
            if (s == session || !s.isOpen()) {
                continue;
            }
            synchronized (s) {
                try {
                    s.sendMessage(new TextMessage(jsonMessage));
                } catch (IllegalStateException e) {
                    System.out.println("Failed to send cursor move to session " + s.getId() + ": " + e.getMessage());
                }
            }
        }
    }
}