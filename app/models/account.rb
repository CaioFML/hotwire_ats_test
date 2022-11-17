class Account < ApplicationRecord
  validate :name, presence: true
end
