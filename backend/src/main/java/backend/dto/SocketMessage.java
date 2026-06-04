package backend.dto;

import backend.model.ChatMessage;
import backend.model.CodeEditorState;
import backend.model.User;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class SocketMessage {
    private String type;
    private String sender;
    private String username;
    private User user;
    private List<User> users;
    private String content;
    private String roomId;
    private Integer lineNumber;
    private Integer column;
    private CodeEditorState codeEditorState;
    private List<ChatMessage> messages;
    private String update;
    private String code;

    public SocketMessage() {
    }
}