let auth = (curl --json '{"username":"admin","password":"admin123"}' 'http://localhost:3000/api/auth/login' | from json)

let token = $auth.access
let refresh = $auth.refresh

# {
#     name: "Max",
#     breedId:2,
#     img:""
#     birthday:"2004-06-24"
#     weight:10
#     sex:"m"
#     exercise:2
#     goal:4
# } | to json | curl -H $"Authorization: Bearer ($token)" --json $in 'localhost:3000/api/pets'

curl -H $"Authorization: Bearer ($token)" 'localhost:3000/api/pets'

print "Testing refresh with access"
curl -X POST -H $"Authorization: Bearer ($token)" 'localhost:3000/api/auth/refresh'
print "Testing refresh with refresh"
curl -X POST -H $"Authorization: Bearer ($refresh)" 'localhost:3000/api/auth/refresh'
print "Testing revoke with access"
curl -X POST -H $"Authorization: Bearer ($token)" 'localhost:3000/api/auth/revoke'
print "Testing revoke with refresh"
curl -X POST -H $"Authorization: Bearer ($refresh)" 'localhost:3000/api/auth/revoke'
print "Testing revoked refresh with access"
curl -X POST -H $"Authorization: Bearer ($token)" 'localhost:3000/api/auth/refresh'
print "Testing revoked refresh with refresh"
curl -X POST -H $"Authorization: Bearer ($refresh)" 'localhost:3000/api/auth/refresh'