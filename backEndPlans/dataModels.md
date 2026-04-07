Rough data model 
core tables:
Users = stores account info (id, username, email, password hash)
Groups = each friend group (id, name, invite code, created by)
GroupMembers = links users to groups (user_id, group_id)  this is the many-to-many model
Availability = each user's weekly availability (user_id, day_of_week, start_time, end_time)  this is the heart of the app
Notifications = alerts when someone joins a group (user_id, message, is_read)

Key backend jobs:

Auth =>register, login, logout with sessions (Flask-Login handles this)
Group management =>create group, generate invite link, join via code
Availability CRUD => user sets/updates their weekly slots
Availability aggregation =>the logic that compares everyone's slots to find overlapping free time (**core of web app)
Notifications => trigger when a new member joins a group
