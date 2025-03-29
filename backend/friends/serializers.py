from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    mutual_friends_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        # Adjust fields as needed; if your User has a 'name' field, use that
        fields = ['id', 'username', 'first_name', 'last_name', 'mutual_friends_count']

    def get_mutual_friends_count(self, obj):
        """
        Return how many friends the current user shares with this user (obj).
        """
        request_user = self.context['request'].user
        # Get the IDs of request_user's friends
        request_user_friend_ids = get_friend_ids(request_user)
        # Get the IDs of obj's friends
        obj_friend_ids = get_friend_ids(obj)
        # Intersection for mutual
        mutual_count = len(request_user_friend_ids.intersection(obj_friend_ids))
        return mutual_count

def get_friend_ids(user):
    """
    Helper: returns a set of all user IDs who are friends with the given user.
    Because we store Friendship in a symmetrical single row, we check both user1 & user2.
    """
    friendships_initiated = user.friendships_initiated.values_list('user2', flat=True)
    friendships_received = user.friendships_received.values_list('user1', flat=True)
    return set(friendships_initiated).union(set(friendships_received))
