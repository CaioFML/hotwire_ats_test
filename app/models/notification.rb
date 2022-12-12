class Notification < ApplicationRecord
  include Rails.application.routes.url_helpers

  belongs_to :user

  scope :unread, -> { where(read_at: nil) }

  serialize :params

  def to_partial_path
    'notifications/notification'
  end
end