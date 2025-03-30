
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json
import numpy as np
import pandas as pd
import joblib
from datetime import date
from ..models import Subscription, User

xgb_model = joblib.load("xgboost_churn_model.pkl")
scaler = joblib.load("scaler.pkl")

# Bucket ranges and their meanings:
# ViewingHoursPerWeek: Low (1-10), Medium (11-20), High (21-30), Very High (31-40)
# AverageViewingDuration: Short (5-50 mins), Moderate (51-100 mins), Long (101-150 mins), Very Long (151-180 mins)
# ContentDownloadsPerMonth: Rare (0-12), Intermediate (13-24), Frequent (25-36), Very Frequent (37-49)
# SupportTicketsPerMonth: Low (0-2), Moderate (3-5), High (6-7), Very High (8-9)
# AccountAge: New (1-30 months), Growing (31-60 months), Loyal (61-90 months), Veteran (91-119 months)
# MonthlyCharges: Low (4-10), Medium (11-14), High (15-17), Very High (18-20)
# UserRating: Poor (1-2), Average (3), Good (4), Excellent (5)
# TotalCharges: Low (5-400), Medium (401-800), High (801-1200), Very High (1201-2229)

# ViewingHoursPerWeek Mapping
viewing_hours_per_week_mapping = {
    "Low": 0, 
    "Medium": 1, 
    "High": 2, 
    "Very High": 3
}

# AverageViewingDuration Mapping
average_viewing_duration_mapping = {
    "Short": 0, 
    "Moderate": 1, 
    "Long": 2, 
    "Very Long": 3
}

# ContentDownloadsPerMonth Mapping
content_downloads_per_month_mapping = {
    "Rare": 0, 
    "Intermediate": 1, 
    "Frequent": 2, 
    "Very Frequent": 3
}

# SupportTicketsPerMonth Mapping
support_tickets_per_month_mapping = {
    "Low": 0, 
    "Moderate": 1, 
    "High": 2, 
    "Very High": 3
}

# AccountAge Mapping
account_age_mapping = {
    "New": 0, 
    "Growing": 1, 
    "Loyal": 2, 
    "Veteran": 3
}

# MonthlyCharges Mapping
monthly_charges_mapping = {
    "Low": 0, 
    "Medium": 1, 
    "High": 2, 
    "Very High": 3
}

# UserRating Mapping
user_rating_mapping = {
    "Poor": 0, 
    "Average": 1, 
    "Good": 2, 
    "Excellent": 3
}

# TotalCharges Mapping
total_charges_mapping = {
    "Low": 0, 
    "Medium": 1, 
    "High": 2, 
    "Very High": 3
}


@method_decorator(csrf_exempt, name='dispatch')
class PredictionView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            user = request.user
            service_name = data.get("service_name") 
            viewing_hours = data.get("viewing_hours_bucket")
            avg_viewing_duration = data.get("avg_viewing_duration_bucket")
            content_downloads = data.get("content_downloads_bucket")
            support_tickets = data.get("support_tickets_bucket")
            user_rating = data.get("user_rating_bucket")
            parental_control = data.get("parental_control")
            print('user', user)
            print('here')
            # Validate input
            if None in [service_name, viewing_hours, avg_viewing_duration, content_downloads, 
                        support_tickets, user_rating, parental_control]:
                return JsonResponse({"error": "Missing required fields"}, status=400)

            print('here1')
                # userid = User.objects.get(name=user)
                # print('fetched 1')
                # subscription = Subscription.objects.get(service_name=service_name, owner=userid)
                # billing_cycle = subscription.billing_cycle
                # amount = float(subscription.amount)
                # start_date = subscription.start_date

            # try:
            #     user = User.objects.get(name=user)
            #     print('Fetched User')
            # except User.DoesNotExist:
            #     print(f"No user found with name: {user}")
            #     return JsonResponse({"error": 'No user found with name'}, status=400)

            # Fetch the subscription for the given service and owner (user)
            subscriptions = Subscription.objects.filter(service_name=service_name, owner=user.id)

            if subscriptions.exists():
                subscription = subscriptions.first()  # Get the first one if there are multiple, or handle accordingly
                billing_cycle = subscription.billing_cycle
                amount = float(subscription.amount)
                start_date = subscription.start_date
                print(f"Subscription found: {subscription}")
            else:
                print(f"No subscription found for service '{service_name}' and user '{user.name}'")
                return JsonResponse({"error": f'No subscription found for service {service_name} and user {user.name}'}, status=400)

                # Handle the error, maybe return or exi


            # except Subscription.DoesNotExist:
            #     return JsonResponse({"error": "Subscription not found for this user"}, status=404)
            print('here2')
            # Convert billing cycle to monthly charges
            if billing_cycle == Subscription.BillingCycle.MONTHLY:
                monthly_charges = amount
            elif billing_cycle == Subscription.BillingCycle.QUARTERLY:
                monthly_charges = amount / 3  # Divide quarterly amount by 3
            elif billing_cycle == Subscription.BillingCycle.YEARLY:
                monthly_charges = amount / 12  # Divide yearly amount by 12
            else:
                return JsonResponse({"error": "Invalid billing cycle"}, status=400)
            # Calculate account age (months)
            today = date.today()
            account_age_months = (today.year - start_date.year) * 12 + (today.month - start_date.month)
            # Categorize account age
            if account_age_months <= 30:
                account_age_bucket = "New"
            elif account_age_months <= 60:
                account_age_bucket = "Growing"
            elif account_age_months <= 90:
                account_age_bucket = "Loyal"
            else:
                account_age_bucket = "Veteran"
            # Calculate total charges
            total_charges = monthly_charges * account_age_months

            # Convert to dollars
            total_charges = total_charges / 86
            monthly_charges = monthly_charges / 86

            # Categorize total charges
            if total_charges <= 400:
                total_charges_bucket = "Low"
            elif total_charges <= 800:
                total_charges_bucket = "Medium"
            elif total_charges <= 1200:
                total_charges_bucket = "High"
            else:
                total_charges_bucket = "Very High"

            # Categorize monthly charges
            if monthly_charges <= 10:
                monthly_charges_bucket = "Low"
            elif monthly_charges <= 14:
                monthly_charges_bucket = "Medium"
            elif monthly_charges <= 17:
                monthly_charges_bucket = "High"
            else:
                monthly_charges_bucket = "Very High"

            input_data = {
                "ViewingHoursPerWeek_Bucket": viewing_hours_per_week_mapping[viewing_hours],
                "AverageViewingDuration_Bucket": average_viewing_duration_mapping[avg_viewing_duration],
                "ContentDownloadsPerMonth_Bucket": content_downloads_per_month_mapping[content_downloads],
                "SupportTicketsPerMonth_Bucket": support_tickets_per_month_mapping[support_tickets],
                "AccountAge_Bucket": account_age_mapping[account_age_bucket],  # Now calculated
                "MonthlyCharges_Bucket": monthly_charges_mapping[monthly_charges_bucket],
                "UserRating_Bucket": user_rating_mapping[user_rating],
                "TotalCharges_Bucket": total_charges_mapping[total_charges_bucket],
                "ParentalControl_Yes": 1 if parental_control == "Yes" else 0  # One-hot encoding
            }
            # Convert input to DataFrame
            input_df = pd.DataFrame([input_data])

            # Apply standard scaling
            input_scaled = scaler.transform(input_df)

            # Make prediction
            # prediction = xgb_model.predict(input_scaled)[0]
            probability = xgb_model.predict_proba(input_scaled)[0][1]  # Get probability of churn
            prediction = 1 if probability >= 0.2 else 0 

            prediction_label = "Unsubscribe" if prediction == 1 else "Keep subscription"

            return JsonResponse({"prediction": prediction_label}, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
