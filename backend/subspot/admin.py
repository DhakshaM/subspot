from django.contrib import admin
from .models import User, Subscription, Listing, FriendConnection, MonthlyExpense, Chat, Message

admin.site.register(User)
admin.site.register(Subscription)
admin.site.register(Listing)
admin.site.register(FriendConnection)
admin.site.register(MonthlyExpense)
admin.site.register(Chat)
admin.site.register(Message)




# Register your models here.
