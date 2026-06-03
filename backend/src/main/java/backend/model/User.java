package backend.model;

@lombok.Getter
@lombok.Setter
public class User {
    private final String userId;
    private String username;

    public User(String userId) {
        this.userId = userId;
    }
}
