from app.services.auth_service import authenticate_rfid
from app.services.user_service import get_all_users, get_user_by_rfid, get_leaderboard, get_user_history
from app.services.trash_service import get_category_by_name, create_trash_detection, get_trash_history, get_trash_summary, get_latest_detection
from app.services.reward_service import list_rewards, get_reward_by_id, redeem_reward, get_redeem_history
from app.services.admin_service import list_categories, create_category, update_category, delete_category, create_reward, update_reward, delete_reward
from app.services.report_service import get_dashboard_summary, get_admin_statistics
