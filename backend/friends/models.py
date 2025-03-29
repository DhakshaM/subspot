# from django.db import models
# from django.conf import settings
# from django.contrib.auth import get_user_model

# User = get_user_model()

# class Friendship(models.Model):
#     """
#     This model represents a mutual friendship between two users.
#     For example, if user1 connects with user2, we store one row here.
#     If you want a 'pending' friend request system, you'd add a status field.
#     """
#     user1 = models.ForeignKey(
#         User, on_delete=models.CASCADE, related_name='friendships_initiated'
#     )
#     user2 = models.ForeignKey(
#         User, on_delete=models.CASCADE, related_name='friendships_received'
#     )
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         unique_together = ('user1', 'user2')

#     def __str__(self):
#         return f"Friendship between {self.user1} and {self.user2}"
