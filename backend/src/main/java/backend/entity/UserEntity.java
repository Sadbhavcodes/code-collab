package backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
@lombok.Setter
@lombok.Getter
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @Column(unique = true)
    private String email;

    private String password;
}
