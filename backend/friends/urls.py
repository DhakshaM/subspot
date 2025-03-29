# from django.urls import path
# from .views import (
#     SuggestedFriendsView,
#     MyFriendsView,
#     ConnectFriendView,
#     RemoveFriendView
# )

# urlpatterns = [
#     path('suggested/', SuggestedFriendsView.as_view(), name='suggested-friends'),
#     path('my/', MyFriendsView.as_view(), name='my-friends'),
#     path('connect/<int:user_id>/', ConnectFriendView.as_view(), name='connect-friend'),
#     path('remove/<int:user_id>/', RemoveFriendView.as_view(), name='remove-friend'),
# ]

from django.urls import path
from . import views

urlpatterns = [
    path('suggested/', views.SuggestedFriendsView.as_view(), name='suggested_friends'),
    path('my/', views.MyFriendsView.as_view(), name='my_friends'),
    path('connect/<int:user_id>/', views.ConnectFriendView.as_view(), name='connect_friend'),
    path('remove/<int:user_id>/', views.RemoveFriendView.as_view(), name='remove_friend'),
]
