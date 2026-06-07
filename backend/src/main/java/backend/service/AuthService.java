package backend.service;

import backend.dto.AuthResponse;
import backend.dto.LoginRequest;
import backend.dto.RegisterRequest;
import backend.entity.UserEntity;
import backend.repository.UserRepository;
import backend.utility.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * Registers a new user and returns an AuthResponse with JWT + username for auto-login.
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("An account with this email already exists.");
        }
        UserEntity user = new UserEntity();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, user.getUsername(), "User registered successfully");
    }

    /**
     * Authenticates an existing user and returns an AuthResponse with JWT + username.
     */
    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found with that email."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Incorrect password.");
        }

        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, user.getUsername(), "Login successful");
    }
}
