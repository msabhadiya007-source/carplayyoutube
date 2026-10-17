# Auth Testing Playbook
- mongosh: use test_database; db.users.findOne({email:"driver@carplayyoutube.com"},{password_hash:1}) -> hash starts with $2b$
- Indexes: users.email unique, login_attempts.identifier unique, user_queues.user_id unique, user_settings.user_id unique
- curl -c cookies.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"driver@carplayyoutube.com","password":"Drive2026!"}'
- curl -b cookies.txt $API/api/auth/me
- Cookies: access_token (15m), refresh_token (7d), httpOnly, Secure, SameSite=Lax
