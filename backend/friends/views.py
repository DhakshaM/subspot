from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from subspot.models import FriendConnection
from .serializers import UserSerializer, get_friend_ids

User = get_user_model()

class SuggestedFriendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = User.objects.exclude(id=request.user.id)
        serializer = UserSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class MyFriendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Return a list of all friends of the current user.
        """
        user = request.user
        friend_ids = get_friend_ids(user)
        queryset = User.objects.filter(id__in=friend_ids)
        serializer = UserSerializer(
            queryset, many=True, context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

class ConnectFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        """
        Create a mutual friendship. 
        """
        user = request.user
        target_user = get_object_or_404(User, id=user_id)

        # Check if friendship already exists
        friendship_exists = Friendship.objects.filter(
            user1__in=[user, target_user],
            user2__in=[user, target_user]
        ).exists()

        if friendship_exists:
            return Response({"detail": "Already friends."}, status=status.HTTP_400_BAD_REQUEST)

        # Create a single row representing mutual friendship
        Friendship.objects.create(user1=user, user2=target_user)

        return Response({"detail": "Connection request sent."}, status=status.HTTP_201_CREATED)

class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        """
        Remove the friendship row for user and user_id if it exists.
        """
        user = request.user
        target_user = get_object_or_404(User, id=user_id)

        # Remove any existing friendship row
        friendship = Friendship.objects.filter(
            user1__in=[user, target_user],
            user2__in=[user, target_user]
        ).first()

        if not friendship:
            return Response({"detail": "Not friends."}, status=status.HTTP_400_BAD_REQUEST)

        friendship.delete()
        return Response({"detail": "Removed friend."}, status=status.HTTP_200_OK)
