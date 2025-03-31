from django.urls import path
from .views import dashboard_views, marketpage_views, friendspage_views
from .views import auth
from .views import ml_prediction_views
from .views.chat_views import ChatListView, ChatDetailView, StartChatView, MarkMessagesReadView, MessageCreateView

urlpatterns = [
    path("auth/login/", auth.Login.as_view(), name="Login"),
    path("auth/logout/", auth.Logout.as_view(), name="Logout"),
    path("auth/signup/", auth.SignUp.as_view(), name="Signup"),
    path("auth/user/", auth.UserInfo.as_view(), name="UserInfo"),
    path("", dashboard_views.home, name="home"),
    # path("dashboard/", dashboard_views.DashboardView.as_view(), name="dashboard"),
    path("subscriptions/", dashboard_views.SubscriptionsView.as_view(), name="subscriptions"),
    path('subscriptions/<int:subscription_id>/', dashboard_views.SubscriptionsView.as_view(), name='subscription_detail'),
    path("expenses/", dashboard_views.UserExpensesView.as_view(), name="expenses"),
    path("reminders/", dashboard_views.SubscriptionRemindersView.as_view(), name="reminders"),
    path("listings/", marketpage_views.AvailableListingsView.as_view(), name="listings"),
    path("unsold-listings/", marketpage_views.UserUnSoldListingsView.as_view(), name="unsold_listings"),
    path("mark-sold/", marketpage_views.MarkSoldView.as_view(), name="mark_sold"),
    path("sold-listings/", marketpage_views.UserSoldListingsView.as_view(), name="sold_listings"),
    path("prediction/", ml_prediction_views.PredictionView.as_view(), name="prediction"),
    path("mark-paid/", dashboard_views.MarkReminderDoneView.as_view(), name="mark_paid"),
    path("edit-listing-price/", marketpage_views.EditListingPrice.as_view(), name="edit_listing_price"),
    path("unsold-expired-listings/", marketpage_views.UserUnSoldExpiredListingsView.as_view(), name="unsold_expired_listings"),
    path("connection/suggested/", friendspage_views.UsersWithMutualFriendsView.as_view(), name="users_with_mutual_friends"),
    path("connection/request/", friendspage_views.SendConnectionRequestView.as_view(), name="send_connection_request"),
    path("connections/", friendspage_views.UserConnectionsView.as_view(), name="user_connections"),
    path("connection/handle/", friendspage_views.HandleConnectionRequestView.as_view(), name="handle_connection_request"),
    path("friends/subscriptions/", friendspage_views.FriendsSubscriptionsView.as_view(), name="friends_subscriptions"),
    path("connection/remove/", friendspage_views.RemoveFriendView.as_view(), name="remove_friend"),
    
    # Chat endpoints
    path("chats/", ChatListView.as_view(), name="chat-list"),
    path("chats/detail/", ChatDetailView.as_view(), name="chat-detail"),
    path("chats/start/", StartChatView.as_view(), name="chat-start"),
    path("messages/create/", MessageCreateView.as_view(), name="message-create"),
    path("messages/mark-read/", MarkMessagesReadView.as_view(), name="message-mark-read"),
]